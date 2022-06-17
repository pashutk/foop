(module
  (memory $mem 1)
  (global
    $mem_max_addr
    (mut i32)
    (i32.const 65536)
  )
  (global
    $mem_next_free
    (mut i32)
    (i32.const 0)
  )
  (func
    $mem_alloc
    (param $bytes i32)
    (result i32)
    (local $_result i32)
    (if
      (i32.lt_u
        (i32.sub
          (global.get $mem_max_addr)
          (global.get $mem_next_free)
        )
        (local.get $bytes)
      )
      (then
        (memory.grow
          (i32.div_u
            (i32.add
              (local.get $bytes)
              (i32.const 65527)
            )
            (i32.const 65528)
          )
        )
        (drop)
        (global.set
          $mem_max_addr
          (i32.add
            (global.get $mem_max_addr)
            (local.get $bytes)
          )
        )
      )
    )
    (local.set
      $_result
      (global.get $mem_next_free)
    )
    (global.set
      $mem_next_free
      (i32.add
        (local.get $bytes)
        (global.get $mem_next_free)
      )
    )
    (local.get $_result)
  )
  (func
    $False
    (result i32)
    (local $struct_start_address i32)
    (i32.const 1)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 0)
    )
    (local.get $struct_start_address)
  )
  (func
    $True
    (result i32)
    (local $struct_start_address i32)
    (i32.const 1)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 1)
    )
    (local.get $struct_start_address)
  )
  (func
    $Cons
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 3)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 2)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 1)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 2)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $Nil
    (result i32)
    (local $struct_start_address i32)
    (i32.const 1)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 3)
    )
    (local.get $struct_start_address)
  )
  (func
    $sumListInner
    (param $list i32)
    (param $result i32)
    (result i32)
    (local $var_97774 i32)
    (local $head i32)
    (local $tail i32)
    (local.set
      $var_97774
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load8_u
          (local.get $var_97774)
        )
        (i32.const 2)
      )
      (then
        (local.set
          $head
          (i32.load8_u
            (i32.add
              (local.get $var_97774)
              (i32.const 1)
            )
          )
        )
        (local.set
          $tail
          (i32.load8_u
            (i32.add
              (local.get $var_97774)
              (i32.const 2)
            )
          )
        )
        (local.get $tail)
        (local.get $head)
        (local.get $result)
        (i32.add)
        (call $sumListInner)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load8_u
              (local.get $var_97774)
            )
            (i32.const 3)
          )
          (then
            (local.get $result)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "sumListInner"
    (func $sumListInner)
  )
  (func
    $sumList
    (param $list i32)
    (result i32)
    (local.get $list)
    (i32.const 0)
    (call $sumListInner)
  )
  (export
    "sumList"
    (func $sumList)
  )
  (func
    $inc
    (param $a i32)
    (result i32)
    (local.get $a)
    (i32.const 1)
    (i32.add)
  )
  (export
    "inc"
    (func $inc)
  )
  (func
    $equal
    (param $a i32)
    (param $b i32)
    (result i32)
    (local $var_57680 i32)
    (local.set
      $var_57680
      (local.get $a)
      (local.get $b)
      (i32.eq)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_57680)
        (i32.const 1)
      )
      (then
        (call $True)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (local.get $var_57680)
            (i32.const 0)
          )
          (then
            (call $False)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "equal"
    (func $equal)
  )
  (func
    $range
    (param $start i32)
    (param $end i32)
    (result i32)
    (local $var_36740 i32)
    (local.set
      $var_36740
      (local.get $end)
      (call $inc)
      (local.get $start)
      (call $equal)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load8_u
          (local.get $var_36740)
        )
        (i32.const 1)
      )
      (then
        (call $Nil)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load8_u
              (local.get $var_36740)
            )
            (i32.const 0)
          )
          (then
            (local.get $start)
            (local.get $start)
            (call $inc)
            (local.get $end)
            (call $range)
            (call $Cons)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "range"
    (func $range)
  )
  (func
    $rangeFromZero
    (param $end i32)
    (result i32)
    (i32.const 0)
    (local.get $end)
    (call $range)
  )
  (export
    "rangeFromZero"
    (func $rangeFromZero)
  )
  (func
    $sumOfNNaturals
    (param $n i32)
    (result i32)
    (local.get $n)
    (call $rangeFromZero)
    (call $sumList)
  )
  (export
    "sumOfNNaturals"
    (func $sumOfNNaturals)
  )
  (func
    $main
    (result i32)
    (i32.const 13)
    (call $sumOfNNaturals)
  )
  (export
    "main"
    (func $main)
  )
)
