(module
  (import
    "wasi_unstable"
    "fd_write"
    (func
      $fd_write
      (param
        i32
        i32
        i32
        i32
      )
      (result i32)
    )
  )
  (memory $mem 1)
  (export
    "memory"
    (memory 0)
  )
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
    $Cons
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 12)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 4)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 8)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $Nil
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 1)
    )
    (local.get $struct_start_address)
  )
  (func
    $IOVec
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 12)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 2)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 4)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 8)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $NWritten
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 3)
    )
    (local.get $struct_start_address)
  )
  (func
    $add
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.add
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $eq
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.eq
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $malloc
    (param $bytes i32)
    (result i32)
    (local.get $bytes)
    (call $mem_alloc)
  )
  (func
    $setByte
    (param $address i32)
    (param $value i32)
    (param $retvalue i32)
    (result i32)
    (i32.store
      (local.get $address)
      (local.get $value)
    )
    (local.get $retvalue)
  )
  (func
    $log
    (param $iovecAddress i32)
    (result i32)
    (call
      $fd_write
      (i32.const 1)
      (local.get $iovecAddress)
      (i32.const 1)
      (call $NWritten)
    )
  )
  (func
    $inc
    (param $a i32)
    (result i32)
    (local.get $a)
    (i32.const 1)
    (call $add)
  )
  (export
    "inc"
    (func $inc)
  )
  (func
    $asciiListToStrInner
    (param $address i32)
    (param $list i32)
    (param $index i32)
    (result i32)
    (local $var_73762 i32)
    (local $a i32)
    (local $tail i32)
    (local.set
      $var_73762
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_73762)
        )
        (i32.const 0)
      )
      (then
        (local.set
          $a
          (i32.load
            (i32.add
              (local.get $var_73762)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_73762)
              (i32.const 8)
            )
          )
        )
        (local.get $address)
        (local.get $index)
        (call $add)
        (local.get $a)
        (local.get $address)
        (call $setByte)
        (local.get $tail)
        (local.get $index)
        (call $inc)
        (call $asciiListToStrInner)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_73762)
            )
            (i32.const 1)
          )
          (then
            (local.get $address)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "asciiListToStrInner"
    (func $asciiListToStrInner)
  )
  (func
    $asciiListToStr
    (param $list i32)
    (result i32)
    (local.get $list)
    (call $length)
    (call $malloc)
    (local.get $list)
    (i32.const 0)
    (call $asciiListToStrInner)
  )
  (export
    "asciiListToStr"
    (func $asciiListToStr)
  )
  (func
    $lengthInner
    (param $list i32)
    (param $result i32)
    (result i32)
    (local $var_23381 i32)
    (local $a i32)
    (local $tail i32)
    (local.set
      $var_23381
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_23381)
        )
        (i32.const 0)
      )
      (then
        (local.set
          $a
          (i32.load
            (i32.add
              (local.get $var_23381)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_23381)
              (i32.const 8)
            )
          )
        )
        (local.get $tail)
        (local.get $result)
        (call $inc)
        (call $lengthInner)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_23381)
            )
            (i32.const 1)
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
    "lengthInner"
    (func $lengthInner)
  )
  (func
    $length
    (param $list i32)
    (result i32)
    (local.get $list)
    (i32.const 0)
    (call $lengthInner)
  )
  (export
    "length"
    (func $length)
  )
  (func
    $data
    (result i32)
    (i32.const 83)
    (i32.const 117)
    (i32.const 115)
    (i32.const 10)
    (call $Nil)
    (call $Cons)
    (call $Cons)
    (call $Cons)
    (call $Cons)
  )
  (export
    "data"
    (func $data)
  )
  (func
    $logList
    (param $list i32)
    (result i32)
    (local.get $list)
    (call $asciiListToStr)
    (local.get $list)
    (call $length)
    (call $IOVec)
    (i32.const 4)
    (call $add)
    (call $log)
  )
  (export
    "logList"
    (func $logList)
  )
  (func
    $main
    (result i32)
    (call $data)
    (call $logList)
  )
  (export
    "main"
    (func $main)
  )
)
