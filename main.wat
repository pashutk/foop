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
    $False
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
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
    $eqNumeric
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.eq
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $eq
    (param $a i32)
    (param $b i32)
    (result i32)
    (local $var_58998 i32)
    (local.set
      $var_58998
      (local.get $a)
      (local.get $b)
      (call $eqNumeric)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_58998)
        (i32.const 1)
      )
      (then
        (call $True)
      )
      (else
        (if
          (result i32)
          (i32.const 1)
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
  (func
    $_start
    (result i32)
    (local $value i32)
    (local $var_96950 i32)
    (i32.const 1)
    (i32.const 2)
    (call $add)
    (local.set $value)
    (local.set
      $var_96950
      (local.get $value)
      (i32.const 3)
      (call $eq)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_96950)
        )
        (i32.const 1)
      )
      (then
        (i32.const 1)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_96950)
            )
            (i32.const 0)
          )
          (then
            (i32.const 0)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "_start"
    (func $_start)
  )
)